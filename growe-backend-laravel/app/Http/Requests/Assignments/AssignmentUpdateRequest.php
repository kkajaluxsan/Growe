<?php

namespace App\Http\Requests\Assignments;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignmentUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'min:1', 'max:255'],
            'description' => ['sometimes', 'string', 'min:1', 'max:10000'],
            'deadline' => ['sometimes', 'date'],
            'status' => ['sometimes', 'string', Rule::in(['PENDING', 'IN_PROGRESS', 'COMPLETED'])],
            'priority' => ['sometimes', 'string', Rule::in(['LOW', 'MEDIUM', 'HIGH'])],
            'adminOverrideCompleted' => ['sometimes', 'boolean'],
        ];
    }
}

